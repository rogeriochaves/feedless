//
//  Router.swift
//  feedless
//
//  Created by Rogerio Chaves on 25/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

enum Route {
    case profile
    case friends
    case secrets
    case communities
    case search
    case debug
}

class Router: ObservableObject {
    let profileScreen = (Route.profile, AnyView(ProfileScreen(id: nil)))
    let friendsScreen = (Route.friends, AnyView(FriendsScreen()))
    let secretsScreen = (Route.secrets, AnyView(SecretsScreen()))
    let communitiesList = (Route.communities, AnyView(CommunitiesList()))
    let searchScreen = (Route.search, AnyView(SearchScreen()))
    let debugScreen = (Route.debug, AnyView(Debug()))

    @Published var currentRoute: (Route, AnyView)
    @Published var navigationBarBackgroundColor: UIColor = Styles.uiBlue
    @Published var navigationBarTextColor: UIColor = Styles.uiBlue

    init() {
        self.currentRoute = self.profileScreen
    }

    func changeRoute(to: (Route, AnyView)) {
        DispatchQueue.main.async {
            self.currentRoute = to
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.02) {
            self.changeNavigationBarColor(route: to.0)
        }
    }

    func changeNavigationBarColor(route: Route) {
        switch route {
        case .profile:
            self.navigationBarBackgroundColor = Styles.uiBlue
            self.navigationBarTextColor = Styles.uiDarkBlue
        case .secrets:
            self.navigationBarBackgroundColor = Styles.uiYellow
            self.navigationBarTextColor = Styles.uiDarkYellow
        case .friends:
            self.navigationBarBackgroundColor = Styles.uiPink
            self.navigationBarTextColor = Styles.uiDarkPink
        case .communities:
            self.navigationBarBackgroundColor = Styles.uiPink
            self.navigationBarTextColor = Styles.uiDarkPink
        default:
            self.navigationBarBackgroundColor = UIColor.white
            self.navigationBarTextColor = UIColor.black
        }
    }

    func changeNavigationBarColorWithDelay(route: Route) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.changeNavigationBarColor(route: route)
        }
    }
}
